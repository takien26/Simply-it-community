import { getM365Config } from '../src/lib/auth/ms365-oauth-handler';

async function main() {
  const config = await getM365Config();
  const tokenEndpoint = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;
  const tokenParams = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });
  const tokenRes = await fetch(tokenEndpoint, {
    method: 'POST',
    body: tokenParams.toString(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  const token = (await tokenRes.json()).access_token;
  
  const res = await fetch('https://graph.microsoft.com/v1.0/subscribedSkus', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Status:', res.status);
  if (res.ok) {
    const data = await res.json();
    console.log('SKUs from API:');
    for (const s of data.value) {
      console.log(`- ${s.skuPartNumber} (id: ${s.skuId}): Total=${s.prepaidUnits.enabled}, Consumed=${s.consumedUnits}, Free=${s.prepaidUnits.enabled - s.consumedUnits}`);
    }
  } else {
    console.log('Error:', await res.text());
  }
}

main().catch(console.error);
