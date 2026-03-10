// Netlify Functions V2 syntax
export default async function () {
  const projectRef = process.env.SUPABASE_PROJECT_REF || "mkjvprcsakvfqxplqolq";
  const cronSecret = process.env.SUPABASE_CRON_SECRET;
  const customBaseUrl = process.env.SUPABASE_FUNCTIONS_BASE_URL;

  console.log("[run-email-worker] ejecutando cron...");

  if (!cronSecret) {
    console.error("[run-email-worker] missing SUPABASE_CRON_SECRET");
    return new Response(JSON.stringify({ error: "Falta SUPABASE_CRON_SECRET en Netlify" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const functionUrl = customBaseUrl
    ? `${customBaseUrl.replace(/\/$/, "")}/send-message-emails`
    : `https://${projectRef}.supabase.co/functions/v1/send-message-emails`;

  try {
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });

    const bodyText = await response.text();
    console.log("[run-email-worker] upstream", response.status, bodyText.slice(0, 500));

    return new Response(bodyText || "{}", {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("[run-email-worker] Fetch error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const config = {
  schedule: "*/1 * * * *",
};
