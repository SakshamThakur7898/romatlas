export const httpUrl = {
  type: String,
  trim: true,
  maxlength: 2048,
  validate: {
    validator: (v: string) => /^https?:\/\/[^\s]+$/i.test(v),
    message: 'Must be a valid http(s) URL',
  },
};
