import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

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

export async function PUT(request) {
  try {
    const body = await request.json();
    const {
      _id,
      client_name,
      client_email,
      client_phone,
      client_address,
      client_status,
      client_photo,
    } = body;

    if (!_id) {
      return NextResponse.json(
        { success: false, message: "Client ID is missing" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("MedTracker");
    const clientsCollection = db.collection("clients");
    const invoicesCollection = db.collection("invoices");

    const oldClient = await clientsCollection.findOne({
      _id: new ObjectId(_id),
    });
    const oldEmail = oldClient?.client_email;

    const result = await clientsCollection.updateOne(
      { _id: new ObjectId(_id) },
      {
        $set: {
          client_name,
          client_email,
          client_phone,
          client_address,
          client_status,
          client_photo,
        },
      },
    );

    if (oldEmail) {
      await invoicesCollection.updateMany(
        { client_email: oldEmail },
        {
          $set: {
            client_name,
            client_email,
            client_phone,
            client_address,
            client_photo,
            client_status,
          },
        },
      );
    }

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: "No client found with this ID" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Client and related invoices updated successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
