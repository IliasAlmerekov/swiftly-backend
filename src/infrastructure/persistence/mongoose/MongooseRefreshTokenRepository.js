class MongooseRefreshTokenRepository {
  constructor({ RefreshToken }) {
    if (!RefreshToken) {
      throw new TypeError("RefreshToken model is required");
    }

    if (typeof RefreshToken.hashToken !== "function") {
      throw new TypeError("RefreshToken.hashToken must be implemented");
    }

    this.RefreshToken = RefreshToken;
  }

  create({ userId, refreshToken, expiresAt }) {
    return this.RefreshToken.create({
      user: userId,
      tokenHash: this.RefreshToken.hashToken(refreshToken),
      expiresAt,
    });
  }

  findActiveByUserAndToken(userId, refreshToken) {
    return this.RefreshToken.findOne({
      user: userId,
      tokenHash: this.RefreshToken.hashToken(refreshToken),
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });
  }

  async revoke(tokenDoc, { replacedByToken = null } = {}) {
    if (!tokenDoc || tokenDoc.revokedAt) {
      return;
    }

    tokenDoc.revokedAt = new Date();
    tokenDoc.replacedByTokenHash = replacedByToken
      ? this.RefreshToken.hashToken(replacedByToken)
      : null;
    await tokenDoc.save();
  }

  async revokeAllByUser(userId) {
    await this.RefreshToken.updateMany(
      { user: userId, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
  }
}

export default MongooseRefreshTokenRepository;
