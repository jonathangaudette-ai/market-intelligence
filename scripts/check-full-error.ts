import { db } from "../src/db";
import { documents } from "../src/db/schema";
import { desc, like } from "drizzle-orm";

async function checkError() {
  const [doc] = await db
    .select({
      id: documents.id,
      name: documents.name,
      status: documents.status,
      errorMessage: documents.errorMessage,
    })
    .from(documents)
    .where(like(documents.name, '%Data Bank%'))
    .orderBy(desc(documents.updatedAt))
    .limit(1);

  if (!doc) {
    console.log("No document found");
    return;
  }

  console.log("Document ID:", doc.id);
  console.log("Name:", doc.name);
  console.log("Status:", doc.status);
  console.log("\n=== FULL ERROR MESSAGE ===\n");
  console.log(doc.errorMessage);
  console.log("\n=== END ===\n");
  console.log("\nError length:", doc.errorMessage?.length || 0, "characters");
}

checkError();
