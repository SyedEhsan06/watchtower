/**
 * Allowlisted server-side operations executed over SSH. The frontend only ever
 * sends one of these structured requests — never a raw command string.
 */
export const SERVER_OPERATIONS = [
  "GET_METRICS",
  "LIST_DOCKER_CONTAINERS",
  "GET_DOCKER_LOGS",
  "INSPECT_DOCKER_CONTAINER",
  "RESTART_DOCKER_CONTAINER",
  "LIST_PM2_PROCESSES",
  "GET_PM2_LOGS",
  "RESTART_PM2_PROCESS",
  "GET_SYSTEMD_STATUS",
  "GET_SYSTEMD_LOGS",
  "RESTART_SYSTEMD_UNIT",
  "GET_GIT_INFO",
] as const;

export type ServerOperation = (typeof SERVER_OPERATIONS)[number];
