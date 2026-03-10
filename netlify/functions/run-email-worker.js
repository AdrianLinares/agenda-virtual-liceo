export const handler = async function (event) {
  const projectRef = process.env.SUPABASE_PROJECT_REF || "mkjvprcsakvfqxplqolq";
  const cronSecret = process.env.SUPABASE_CRON_SECRET;
  const customBaseUrl = process.env.SUPABASE_FUNCTIONS_BASE_URL;
  const triggerType = event?.headers?.["x-nf-event"] || "http";

  console.log("[run-email-worker] trigger", triggerType);

  if (!cronSecret) {
    console.error("[run-email-worker] missing SUPABASE_CRON_SECRET");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Falta SUPABASE_CRON_SECRET en Netlify" }),
    };
  }

  const functionUrl = customBaseUrl
    ? `${customBaseUrl.replace(/\/$/, "")}/send-message-emails`
    : `https://${projectRef}.supabase.co/functions/v1/send-message-emails`;

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

  return {
    statusCode: response.status,
    body: bodyText || "{}",
  };
};

export const config = {
  schedule: "*/1 * * * *",
};
