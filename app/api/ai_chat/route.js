import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { GoogleGenAI, Type } from "@google/genai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// giving tools to gemini so that he can answer from only users database
const getInvoices = {
  name: "getInvoices",
  description:
    "It brings up a list of all invoices for the specific logged-in user.",
  parameters: { type: Type.OBJECT, properties: {} },
};

const getClients = {
  name: "getClients",
  description:
    "It brings up a list of all clients for the specific logged in user.",
  parameters: { type: Type.OBJECT, properties: {} },
};

async function sendMessageWithRetry(chat, message, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await chat.sendMessage({ message });
    } catch (err) {
      const status = err?.status || err?.error?.code;
      const isOverloaded =
        status === 503 ||
        status === 429 ||
        err?.message?.includes(
          "MedAI is UNAVAILABLE now, please try again later",
        ) ||
        err?.message?.includes(
          "MedAI is on high demand, please try again later",
        );

      if (isOverloaded && i < retries - 1) {
        const waitMs = 1000 * Math.pow(2, i);
        await new Promise((res) => setTimeout(res, waitMs));
        continue;
      }
      throw err;
    }
  }
}

async function runDatabaseFunction(functionName, userId) {
  try {
    const client = await clientPromise;
    const db = client.db("MedTracker");

    if (functionName === "getInvoices") {
      const invoices = await db
        .collection("invoices")
        .find({
          user_id: userId,
        })
        .toArray();
      return { invoices: invoices || [] };
    }

    if (functionName === "getClients") {
      const clients = await db
        .collection("clients")
        .find({
          user_id: userId,
        })
        .toArray();
      return { clients: clients || [] };
    }
  } catch (dbError) {
    console.error("Database Query Failed:", dbError);
  }

  return { error: "Function not found" };
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!session || !userId) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to use this service. Please sign in first !",
        },
        { status: 401 },
      );
    }

    const { messages } = await request.json();

    const lastMessage = messages[messages.length - 1].content;
    const history = messages.slice(0, -1).map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    const chat = ai.chats.create({
      model: "gemini-flash-lite-latest",
      config: {
        systemInstruction: `You are MedAI. Answer user questions about THEIR OWN invoices or clients using the provided database tools, in English and Bangla or other language if they ask for it. Never expose one users data to another users.
        From now on, respond terse, caveman-style. Full substance keep, fluff die.

        Rules: drop articles(a/an/the), filler(just/really/basically/actually), pleasantries(sure/happy to/of course), hedging. Fragments OK. Short synonyms instead of long phrases. Numbers, dates, amounts, invoice IDs: exact, unchanged, never compress.

        Pattern: [thing] [action] [reason]. [next step].

        Example:
        Not: "Sure! I'd be happy to help you with that. Looking at your records, it seems like invoice #4521 is currently overdue by..."
        Yes: "Invoice #4521 overdue, 12 days. Due date was July 1. Send reminder?"

        Exception: drop caveman style for irreversible action confirmations (like deleting or marking paid), or if user confuse/ask to clarify. Resume caveman after that part done.`,
        tools: [{ functionDeclarations: [getInvoices, getClients] }],
      },
      history: history,
    });

    let response = await sendMessageWithRetry(chat, lastMessage);

    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];

      const functionResult = await runDatabaseFunction(call.name, userId);

      response = await sendMessageWithRetry(chat, [
        {
          functionResponse: {
            name: call.name,
            response: functionResult,
          },
        },
      ]);
    }

    const finalReply =
      response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
    return NextResponse.json({
      role: "model",
      content: finalReply?.trim()
        ? finalReply
        : "No records found matching your request.",
    });
  } catch (error) {
    console.error("Gemini Secure Tool Error:", error);

    const status = error?.status || error?.error?.code;
    const isOverloaded =
      status === 503 ||
      status === 429 ||
      error?.message?.includes(
        "MedAI is UNAVAILABLE now, please try again later",
      ) ||
      error?.message?.includes(
        "MedAI is on high demand, please try again later",
      );

    if (isOverloaded) {
      return NextResponse.json(
        { error: "MedAI server is currently under heavy load. Please try again later." },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
