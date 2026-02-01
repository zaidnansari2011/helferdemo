import prisma from "../server/db";

async function listAdmins() {
  const admins = await prisma.user.findMany({
    where: {
      profile: {
        role: "ADMIN"
      }
    },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
      createdAt: true,
      profile: {
        select: {
          role: true
        }
      }
    },
  });

  console.log("\n📋 Admin Users:\n");
  if (admins.length === 0) {
    console.log("No admin users found.");
  } else {
    admins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.name || "No name"}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   ID: ${admin.id}`);
      console.log(`   Role: ${admin.profile?.role || "No profile"}`);
      console.log(`   Verified: ${admin.emailVerified ? "Yes" : "No"}`);
      console.log(`   Created: ${admin.createdAt.toISOString()}`);
      console.log("");
    });
    console.log(`Total: ${admins.length} admin user(s)\n`);
  }

  await prisma.$disconnect();
}

listAdmins();
