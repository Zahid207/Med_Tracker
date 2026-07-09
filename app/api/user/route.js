import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("MedTracker");
    const collection = db.collection("users");

    const items = await collection.find({}).toArray();

    return NextResponse.json(items);
  } catch (error) {
    console.error("Database error during fetching users:", error);
    return NextResponse.json(
      { error: "Server error, failed to fetch users!" },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { user_name, role, user_photo, user_email, password } = body;

    const client = await clientPromise;
    const db = client.db("MedTracker");
    const collection = db.collection("users");

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await collection.insertOne({
      user_name,
      role,
      user_photo,
      user_email: user_email.trim().toLowerCase(),
      password: hashedPassword,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      error: false,
      message: "Your account has been registered successfully!",
      result: result,
    });
  } catch (error) {
    console.error("Database error during registration:", error);
    return NextResponse.json(
      {
        success: false,
        error: true,
        message: "Server error, failed to register user!",
      },
      { status: 500 },
    );
  }
}
