export const issueTokenPair = async ({
  user,
  tokenProvider,
  refreshTokenRepo,
}) => {
  const accessToken = tokenProvider.signAccessToken(user);
  const refreshToken = tokenProvider.signRefreshToken(user);
  const expiresAt = tokenProvider.resolveTokenExpiryDate(refreshToken);

  await refreshTokenRepo.create({
    userId: user._id,
    refreshToken,
    expiresAt,
  });

  return { accessToken, refreshToken };
};
