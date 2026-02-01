import prisma from "../server/db";
import { hash } from "@node-rs/argon2";

async function setPassword() {
  const email = "5784955675@temp.blinkit.com";
  const password = "123456";

  // Hash the password
  const hashedPassword = await hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.log("User not found");
    return;
  }

  // Check if credential account exists
  let account = await prisma.account.findFirst({
    where: {
      userId: user.id,
      providerId: "credential",
    },
  });

  if (account) {
    // Update existing account
    await prisma.account.update({
      where: { id: account.id },
      data: { password: hashedPassword },
    });
    console.log("✅ Password updated for:", email);
  } else {
    // Create new credential account
    await prisma.account.create({
      data: {
        userId: user.id,
        accountId: email,
        providerId: "credential",
        password: hashedPassword,
      },
    });
    console.log("✅ Credential account created for:", email);
  }

  console.log("Password:", password);

  await prisma.$disconnect();
}

setPassword();
