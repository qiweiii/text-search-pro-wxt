export const getStorage = async (key: string) => {
  const storage = await browser.storage.local.get(key);

  if (!storage[key]) {
    throw new Error("Storage not found");
  }
  return storage[key];
};

export const setStorage = async (key: string, value: any) => {
  const newStorage = { [key]: value };
  await browser.storage.local.set(newStorage);
};

export const removeStorage = async (key: string) => {
  const storage = await browser.storage.local.get(key);
  let newStorage = { ...storage };
  delete newStorage[key];
  await browser.storage.local.set(newStorage);
};

// ========= business logic =========
export const increaseSearchNoBy1 = async () => {
  const searchNum = await getStorage("searchNum");
  const newSearchNum = Number(searchNum) + 1;
  await setStorage("searchNum", `${newSearchNum}`);
  return newSearchNum;
};
