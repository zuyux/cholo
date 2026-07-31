type SignChallenge = (message: string) => Promise<{ signature: string; publicKey?: string }>;

export async function authenticateRewardWallet(address: string, signChallenge: SignChallenge) {
  const challengeResponse = await fetch('/api/rewards/auth/challenge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address }) });
  const challenge = await challengeResponse.json();
  if (!challengeResponse.ok) throw new Error(challenge.error || 'No se pudo iniciar la autenticación');
  const proof = await signChallenge(challenge.message);
  const verifyResponse = await fetch('/api/rewards/auth/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(proof) });
  const verified = await verifyResponse.json();
  if (!verifyResponse.ok) throw new Error(verified.error || 'No se pudo verificar la billetera');
}
