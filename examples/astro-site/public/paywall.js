export function unlockPremium() {
  const token = localStorage.getItem('premiumToken');
  return !!token;
}

export function setPremiumToken(token) {
  localStorage.setItem('premiumToken', token);
}

if (!unlockPremium()) {
  const premium = document.getElementById('premium-tools');
  if (premium) premium.style.display = 'none';
  const banner = document.getElementById('upgrade-banner');
  if (banner) banner.style.display = 'block';
}
