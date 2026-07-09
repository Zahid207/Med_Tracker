import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(request) {
  try {
    const body = await request.json();

    const client = await clientPromise;
    const db = client.db("MedTracker");
    const collection = db.collection("invoices");

    const result = await collection.insertOne({
      ...body,
      createdAt: new Date(),
    });
    return Response.json({
      success: true,
      error: false,
      message: "Your Invoice has been generated successfully! ",
      result: result,
    });
  } catch (error) {
    console.error("Database error:", error);
    return Response.json(
      {
        success: false,
        error: true,
        message: "Server error, failed to save invoice!",
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
    const collection = db.collection("invoices");

    const items = await collection.find({ user_id: userId }).toArray();

    return NextResponse.json(items);
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
    const client = await clientPromise;
    const db = client.db("MedTracker");
    const collection = db.collection("invoices");

    // ---------------------------------------------------------
    // CASE 1: FULL INVOICE EDIT 
    // ---------------------------------------------------------
    if (body._id) {
      const { _id, ...updateData } = body;

      const result = await collection.updateOne(
        { _id: new ObjectId(_id) },
        { $set: updateData } 
      );

      if (result.matchedCount === 0) {
        return NextResponse.json(
          { success: false, message: "No invoice found with this ID" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Invoice updated successfully",
      });
    } 
    
    // ---------------------------------------------------------
    // CASE 2: PAYMENT RECORD 
    // ---------------------------------------------------------
    else if (body.invoiceId) {
      const {
        invoiceId,
        invoice_paymented_ammount,
        invoice_payment_date,
        invoice_payment_methode,
      } = body;

      if (!invoiceId) {
        return NextResponse.json(
          { success: false, message: "Invoice ID is missing" },
          { status: 400 }
        );
      }

      const result = await collection.updateOne(
        { _id: new ObjectId(invoiceId) },
        {
          $set: {
            invoice_paymented_ammount: Number(invoice_paymented_ammount) || 0,
            invoice_payment_date: invoice_payment_date,
            invoice_payment_methode: invoice_payment_methode,
            status: "paid",
          },
        }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json(
          { success: false, message: "No invoice found with this ID" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Payment recorded successfully",
      });
    } 
    
    // ---------------------------------------------------------
    // CASE 3: INVALID REQUEST 
    // ---------------------------------------------------------
    else {
      return NextResponse.json(
        { success: false, message: "Invalid request: No valid ID provided" },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
