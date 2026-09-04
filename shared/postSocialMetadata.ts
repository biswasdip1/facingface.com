export const POST_FEELINGS = [
  { value: "happy", emoji: "😊", label: "Happy" },
  { value: "blessed", emoji: "🙏", label: "Blessed" },
  { value: "excited", emoji: "🤩", label: "Excited" },
  { value: "thankful", emoji: "💛", label: "Thankful" },
  { value: "loved", emoji: "🥰", label: "Loved" },
  { value: "sad", emoji: "😔", label: "Sad" },
  { value: "tired", emoji: "😴", label: "Tired" },
  { value: "celebrating", emoji: "🎉", label: "Celebrating" },
  { value: "watching", emoji: "📺", label: "Watching" },
  { value: "travelling", emoji: "✈️", label: "Travelling" },
  { value: "eating", emoji: "🍽️", label: "Eating" },
  { value: "listening", emoji: "🎧", label: "Listening to music" },
] as const;

export type PostFeelingValue = (typeof POST_FEELINGS)[number]["value"];
export const POST_FEELING_VALUES = POST_FEELINGS.map((feeling) => feeling.value) as [PostFeelingValue, ...PostFeelingValue[]];

export function getPostFeeling(value: string | null | undefined) {
  return POST_FEELINGS.find((feeling) => feeling.value === value) ?? null;
}
