// recoil/userAtom.js
import { atom } from "recoil";

const savedUser = localStorage.getItem("user");

export const userAtom = atom({
  key: "userAtom",
  default: savedUser ? JSON.parse(savedUser) : null,
});
