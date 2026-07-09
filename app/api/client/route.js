import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(request) {
  try {
    const body = await request.json();

    const client = await clientPromise;
    const db = client.db("MedTracker");
    const collection = db.collection("clients");

    const result = await collection.insertOne({
      ...body,
      createdAt: new Date(),
    });
    return Response.json({
      success: true,
      error: false,
      message: "Your Client has been added successfully!",
      result: result,
    });
  } catch (error) {
    console.error("Database error:", error);
    return Response.json(
      {
        success: false,
        error: true,
        message: "Server error, failed to save clinet!",
      },
      { status: 500 },
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const client = await clientPromise;
    const db = client.db("MedTracker");
    const collection = db.collection("clients");

    const clients = await collection.find({ user_id: userId }).toArray();

    return NextResponse.json(clients);
  } catch (error) {
    return NextResponse.json(
      { error: "Server error, failed to fetch invoices!" },
      { status: 500 },
    );
  }
}
