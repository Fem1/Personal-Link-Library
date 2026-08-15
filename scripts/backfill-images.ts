/**
 * One-time maintenance script: fill in image_url for links saved before
 * the thumbnail feature existed (or that never got an image for other
 * reasons). Safe to re-run — it only touches rows still missing an image.
 *
 * Usage: npm run backfill-images
 */
import { getDb } from "../src/lib/db";
import { scrapeImageOnly } from "../src/lib/scrape";

interface PendingRow {
  id: number;
  url: string;
}

async function main() {
  const db = getDb();
  const rows = db
    .prepare("SELECT id, url FROM links WHERE image_url IS NULL ORDER BY id ASC")
    .all() as PendingRow[];

  if (rows.length === 0) {
    console.log("Nothing to backfill — every link already has an image_url (or none).");
    return;
  }

  console.log(`Backfilling images for ${rows.length} link(s)...`);

  const update = db.prepare("UPDATE links SET image_url = ? WHERE id = ?");

  let updated = 0;
  let notFound = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const { id, url } = rows[i];
    const progress = `[${i + 1}/${rows.length}]`;

    try {
      const imageUrl = await scrapeImageOnly(url);
      if (imageUrl) {
        update.run(imageUrl, id);
        updated++;
        console.log(`${progress} done — link ${id} (${url}) -> ${imageUrl}`);
      } else {
        notFound++;
        console.log(`${progress} no image found — link ${id} (${url})`);
      }
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`${progress} failed — link ${id} (${url}): ${message}`);
    }
  }

  console.log(
    `\nDone. ${updated} updated, ${notFound} had no image, ${failed} failed.`
  );
}

main()
  .catch((err) => {
    console.error("Backfill script crashed:", err);
    process.exitCode = 1;
  })
  .finally(() => {
    getDb().close();
  });
