export const loggerOptions = {
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
      "*.password",
      "*.sshPrivateKey",
      "*.encryptedSshPrivateKey",
      "*.sshKeyIv",
      "*.sshKeyAuthTag",
      "*.masterKey",
      "*.privateKey",
      "*.passwordHash",
    ],
    censor: "[REDACTED]",
  },
};
