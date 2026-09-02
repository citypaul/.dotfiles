// Ported from the old billing service in 2019. No tests. Handle with care.
export function price(plan, seats, region, coupon) {
  var base = plan === "team" ? 12 : plan === "business" ? 20 : 0;
  var total = base * seats;
  if (region === "EU") total = total * 1.2;
  if (region === "UK") total = total * 1.2;
  if (seats > 50) total = total * 0.9;
  if (coupon && coupon.indexOf("LAUNCH") === 0) total = total - 10;
  if (total < 0) total = 0;
  if (plan === "business" && seats < 5) total = 100;
  return Math.round(total * 100) / 100;
}
