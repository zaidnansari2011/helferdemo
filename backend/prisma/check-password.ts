import prisma from "../server/db";

async function checkPassword() {
  const user = await prisma.user.findUnique({
    where: { email: "5784955675@temp.blinkit.com" },
    include: {
      accounts: true,
    },
  });

  if (!user) {
    console.log("User not found");
    return;
  }

  console.log("\nUser Details:");
  console.log("Email:", user.email);
  console.log("Name:", user.name);
  console.log("\nAccounts:", user.accounts.length);
  
  user.accounts.forEach((account, i) => {
    console.log(`\nAccount ${i + 1}:`);
    console.log("Provider:", account.providerId);
    console.log("Has password:", account.password ? "Yes" : "No");
    if (account.password) {
      console.log("Password hash:", account.password.substring(0, 20) + "...");
    }
  });

  await prisma.$disconnect();
}

checkPassword();
