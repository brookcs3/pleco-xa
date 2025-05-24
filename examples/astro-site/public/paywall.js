export function unlockPremium() {
  const token = localStorage.getItem('premiumToken');
  const expires = localStorage.getItem('premiumTokenExpires');
  if (token && expires) {
    const expiry = parseInt(expires, 10);
    if (Date.now() < expiry) {
      return true;
    }
    localStorage.removeItem('premiumToken');
    localStorage.removeItem('premiumTokenExpires');
  }
  return false;
}

export function setPremiumToken(token, daysValid = 30) {
  const expiry = Date.now() + daysValid * 864e5; // days to ms
  localStorage.setItem('premiumToken', token);
  localStorage.setItem('premiumTokenExpires', String(expiry));
}

const premium = document.getElementById('premium-tools');
const banner = document.getElementById('upgrade-banner');
if (unlockPremium()) {
  if (premium) premium.style.display = 'block';
  if (banner) banner.style.display = 'none';
} else {
  if (premium) premium.style.display = 'none';
  if (banner) banner.style.display = 'block';
}
