import { prisma } from "../lib/db";

async function main() {
  await prisma.design.create({
    data: {
      baseSvgUrl: "https://example.com/placeholder.svg",
      canvasJson: "[]",
    },
  });
  console.log("Seed: created one Design record.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
