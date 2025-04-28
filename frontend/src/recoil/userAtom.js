import { atom } from "recoil";

const savedUser = localStorage.getItem("user");

const defaultUser = {
  id: "",
  name: "",
  email: "",
  role: "",
  location: {
    type: "Point",
    coordinates: [0, 0],
    address: "",
  },
  profilePic: "",
  bio: "",
  rating: 0,
  loading: false,
};

export const userAtom = atom({
  key: "userAtom",
  default: savedUser ? { ...defaultUser, ...JSON.parse(savedUser) } : defaultUser,
});