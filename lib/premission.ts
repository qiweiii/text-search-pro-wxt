import { Manifest } from "wxt/browser";

// NOTE: permissions cannot be get and set in content script and background
// it can be in action, popup, or options page

// const requestPermissions = async (
//   permissions: Manifest.OptionalPermission[]
// ) => {
//   const granted = await browser.permissions.request({
//     permissions,
//   });
//   return granted;
// };

// export const requestIdentityPermission = async () => {
//   const granted = await requestPermissions(["xxx"]);
//   return granted;
// };

// export const hasIdentityPermission = async () => {
//   const granted = await browser.permissions.contains({
//     permissions: ["xxx"],
//   });
//   return granted;
// };
