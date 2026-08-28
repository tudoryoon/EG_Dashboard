const NEW_YORK = "America/New_York";

const DISPATCHES = {
  "16:12": {
    workflow: "update-market-critical-morning.yml",
    label: "daily-briefing-primary",
  },
  "16:27": {
    workflow: "update-market-rs.yml",
    label: "market-rs-primary",
  },
  "16:42": {
    workflow: "update-market-critical-morning.yml",
    label: "daily-briefing-freshness-retry",
  },
  "16:55": {
    workflow: "update-market-rs.yml",
    label: "market-rs-freshness-retry",
  },
};

function newYorkScheduleParts(timestamp) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: NEW_YORK,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(
    parts.filter(({ type }) => type !== "literal").map(({ type, value }) => [type, value]),
  );
  return { weekday: values.weekday, time: `${values.hour}:${values.minute}` };
}

function workForScheduledTime(timestamp) {
  const { weekday, time } = newYorkScheduleParts(timestamp);
  if (["Sat", "Sun"].includes(weekday)) {
    return null;
  }
  return DISPATCHES[time] ?? null;
}

async function dispatchWorkflow(env, work, scheduledTime) {
  const owner = env.GITHUB_OWNER || "tudoryoon";
  const repository = env.GITHUB_REPO || "EG_Dashboard";
  if (!env.GH_ACTIONS_TOKEN) {
    throw new Error("GH_ACTIONS_TOKEN is not configured");
  }

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repository}/actions/workflows/${work.workflow}/dispatches`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${env.GH_ACTIONS_TOKEN}`,
        "User-Agent": "eg-market-refresh-dispatcher",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        ref: "main",
        inputs: {
          refresh_if_stale: "true",
          dispatch_source: "cloudflare",
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`GitHub dispatch failed (${response.status}): ${await response.text()}`);
  }

  console.log(JSON.stringify({ event: "workflow_dispatched", label: work.label, scheduledTime }));
}

export default {
  async scheduled(controller, env, ctx) {
    const scheduledTime = controller.scheduledTime || Date.now();
    const work = workForScheduledTime(scheduledTime);
    if (!work) {
      return;
    }
    ctx.waitUntil(dispatchWorkflow(env, work, new Date(scheduledTime).toISOString()));
  },

  async fetch() {
    return Response.json({ service: "eg-market-refresh-dispatcher", status: "ok" });
  },
};

export { newYorkScheduleParts, workForScheduledTime };
