import avatar01 from "@/assets/avatars/avatar-01.png";
import avatar02 from "@/assets/avatars/avatar-02.png";
import avatar03 from "@/assets/avatars/avatar-03.png";
import avatar04 from "@/assets/avatars/avatar-04.png";
import avatar05 from "@/assets/avatars/avatar-05.png";
import avatar06 from "@/assets/avatars/avatar-06.png";
import avatar07 from "@/assets/avatars/avatar-07.png";
import avatar08 from "@/assets/avatars/avatar-08.png";
import avatar09 from "@/assets/avatars/avatar-09.png";
import avatar10 from "@/assets/avatars/avatar-10.png";
import avatar11 from "@/assets/avatars/avatar-11.png";
import avatar12 from "@/assets/avatars/avatar-12.png";
import avatar13 from "@/assets/avatars/avatar-13.png";
import avatar14 from "@/assets/avatars/avatar-14.png";
import avatar15 from "@/assets/avatars/avatar-15.png";
import avatar16 from "@/assets/avatars/avatar-16.png";
import avatar17 from "@/assets/avatars/avatar-17.png";
import avatar18 from "@/assets/avatars/avatar-18.png";
import avatar19 from "@/assets/avatars/avatar-19.png";
import avatar20 from "@/assets/avatars/avatar-20.png";

export interface AvatarOption {
  id: string;
  src: string;
  label: string;
}

export const AVATARS: AvatarOption[] = [
  { id: "avatar-01", src: avatar01, label: "Boy with brown hair" },
  { id: "avatar-02", src: avatar02, label: "Girl with black hair" },
  { id: "avatar-03", src: avatar03, label: "Boy with curly hair" },
  { id: "avatar-04", src: avatar04, label: "Girl with afro" },
  { id: "avatar-05", src: avatar05, label: "Asian boy" },
  { id: "avatar-06", src: avatar06, label: "Girl with bob cut" },
  { id: "avatar-07", src: avatar07, label: "Boy with glasses" },
  { id: "avatar-08", src: avatar08, label: "Girl with hijab" },
  { id: "avatar-09", src: avatar09, label: "Bald man" },
  { id: "avatar-10", src: avatar10, label: "Redhead girl" },
  { id: "avatar-11", src: avatar11, label: "Boy with cap" },
  { id: "avatar-12", src: avatar12, label: "Blonde girl" },
  { id: "avatar-13", src: avatar13, label: "Boy with afro" },
  { id: "avatar-14", src: avatar14, label: "Girl with braids" },
  { id: "avatar-15", src: avatar15, label: "Korean boy" },
  { id: "avatar-16", src: avatar16, label: "Korean girl" },
  { id: "avatar-17", src: avatar17, label: "Boy with hoodie" },
  { id: "avatar-18", src: avatar18, label: "Girl with buns" },
  { id: "avatar-19", src: avatar19, label: "Grandpa" },
  { id: "avatar-20", src: avatar20, label: "Southeast Asian girl" },
];

export function getAvatarById(id: string | null | undefined): AvatarOption {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}
