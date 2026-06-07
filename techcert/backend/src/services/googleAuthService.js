const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const Admin = require("../models/Admin");

function getGoogleClientId() {
  return process.env.GOOGLE_CLIENT_ID || "";
}

function isGoogleAuthConfigured() {
  return Boolean(getGoogleClientId());
}

async function verifyGoogleCredential(credential) {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error("Google sign-in is not configured on the server.");
  }

  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: clientId,
  });

  const payload = ticket.getPayload();
  if (!payload?.email || !payload.sub) {
    throw new Error("Google account is missing required profile information.");
  }

  if (payload.email_verified === false) {
    throw new Error("Google email address is not verified.");
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase().trim(),
    name: payload.name?.trim() || payload.email.split("@")[0],
  };
}

async function findOrCreateGoogleUser(profile) {
  let admin = await Admin.findOne({ googleId: profile.googleId });

  if (admin) {
    return admin;
  }

  admin = await Admin.findOne({ email: profile.email });

  if (admin) {
    if (admin.googleId && admin.googleId !== profile.googleId) {
      throw new Error("This email is already linked to a different Google account.");
    }

    admin.googleId = profile.googleId;
    if (!admin.name && profile.name) {
      admin.name = profile.name;
    }
    if (admin.authProvider === "local" && admin.password) {
      admin.authProvider = "local";
    } else {
      admin.authProvider = "google";
    }
    await admin.save();
    return admin;
  }

  return Admin.create({
    email: profile.email,
    name: profile.name,
    googleId: profile.googleId,
    authProvider: "google",
    password: crypto.randomBytes(32).toString("hex"),
  });
}

module.exports = {
  getGoogleClientId,
  isGoogleAuthConfigured,
  verifyGoogleCredential,
  findOrCreateGoogleUser,
};
