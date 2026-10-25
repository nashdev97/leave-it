export const decisionSchema = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          verdict: { type: "string", enum: ["leave", "two_minute", "later"] },
          why: { type: "string" },
          move: { type: "string" },
          minutes_proper: { type: "integer" },
          minutes_now: { type: "integer" },
        },
        required: ["verdict", "why", "move", "minutes_proper", "minutes_now"],
      },
    },
  },
  required: ["items"],
};

export function decisionSchemaFor(count) {
  return {
    type: "object",
    properties: {
      items: {
        type: "array",
        minItems: count,
        maxItems: count,
        items: decisionSchema.properties.items.items,
      },
    },
    required: ["items"],
  };
}
