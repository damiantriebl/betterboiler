import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AvatarUserProps {
  src?: string | null;
  name?: string;
}

const getInitials = (name: string) => {
  if (!name) return "?";
  const words = name.split(" ").filter(Boolean);
  return words.length > 1
    ? `${words[0][0]}${words[1][0]}`.toUpperCase()
    : `${words[0][0]}`.toUpperCase();
};

const colorPairs = [
  { bg: "bg-blue-500", text: "text-white", border: "border-blue-700" },
  { bg: "bg-red-500", text: "text-white", border: "border-red-700" },
  { bg: "bg-green-500", text: "text-black", border: "border-green-700" },
  { bg: "bg-yellow-500", text: "text-black", border: "border-yellow-700" },
  { bg: "bg-purple-500", text: "text-white", border: "border-purple-700" },
  { bg: "bg-pink-500", text: "text-white", border: "border-pink-700" },
  { bg: "bg-indigo-500", text: "text-white", border: "border-indigo-700" },
  { bg: "bg-teal-500", text: "text-black", border: "border-teal-700" },
  { bg: "bg-orange-500", text: "text-black", border: "border-orange-700" },
  { bg: "bg-gray-500", text: "text-white", border: "border-gray-700" },
];

const getColorScheme = (name: string) => {
  const index = name ? name.length % colorPairs.length : 0;
  return colorPairs[index];
};

const AvatarUser = ({ src, name }: AvatarUserProps) => {
  const { bg, text, border } = getColorScheme(name || "");

  return (
    <Avatar className={`border-2 ${border} size-14`}>
      <AvatarImage src={src ?? undefined} />
      <AvatarFallback className={`${bg} ${text} font-bold text-lg`}>
        {getInitials(name || "")}
      </AvatarFallback>
    </Avatar>
  );
};

export default AvatarUser;
