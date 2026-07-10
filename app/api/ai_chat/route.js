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

// Database function (where user filtering will take place)
async function runDatabaseFunction(functionName, userEmail) {
  const client = await clientPromise;
  const db = client.db("MedTracker");

  if (functionName === "getInvoices") {
    const invoices = await db
      .collection("invoices")
      .find({ userEmail: userEmail })
      .toArray();
    return { invoices };
  }

  if (functionName === "getClients") {
    const clients = await db
      .collection("clients")
      .find({ userEmail: userEmail })
      .toArray();
    return { clients };
  }

  return { error: "Function not found" };
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!session || !userId) {
      return NextResponse.json(
        { error: "Unauthorized! Please sign in first." },
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
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: `You are MedTracker AI. Answer user questions about THEIR OWN invoices or clients using the provided database tools, in English and Bangla if they ask for it. Never expose data to other users.

        Respond terse, caveman-style. Full substance keep, fluff die. Rules: drop articles (a/an/the), filler (just/really/basically/actually), pleasantries (sure/happy to/of course), hedging. Fragments OK. Short synonyms instead of long phrases. Numbers, dates, amounts, invoice IDs, client names: exact, unchanged, never compress.

        Pattern: [thing] [action] [reason]. [next step].

        Example:
        Not: 'Sure! I'd be happy to help you with that. Looking at your records, it seems like invoice #4521 is currently overdue by...'
        Yes: 'Invoice #4521 overdue, 12 days. Due date was July 1. Send reminder?'

        Exception: drop caveman style for irreversible action confirmations (like deleting or marking paid), or if user confuse/ask to clarify. Resume caveman after that part done.`,
        tools: [{ functionDeclarations: [getInvoices, getClients] }],
      },
      history: history,
    });

    let response = await chat.sendMessage({ message: lastMessage });

    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];

      const functionResult = await runDatabaseFunction(call.name, userId);

      response = await chat.sendMessage({
        message: [
          {
            functionResponse: {
              name: call.name,
              response: functionResult,
            },
          },
        ],
      });
    }

    return NextResponse.json({ role: "model", content: response.text });
  } catch (error) {
    console.error("Gemini Secure Tool Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
