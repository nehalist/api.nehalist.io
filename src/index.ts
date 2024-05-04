import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import fetch from "node-fetch";
import { z } from "zod";

require("dotenv").config({
  path: [".env.local", ".env"],
});

const app = express();

app.use(morgan("dev"));
app.use(helmet());
app.use(express.json());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Too many requests, please try again later." },
  }),
);

app.get("/favicon.ico", (req, res) => res.status(204));

app.get("/", (req, res) => {
  return res.json({ message: "Hello there" });
});

const contactSchema = z.object({
  name: z.string().min(3).max(255),
  email: z.string().email(),
  message: z.string().min(10),
});
app.post("/contact", async (req, res) => {
  try {
    const payload = contactSchema.parse(req.body);

    const formData = new FormData();
    formData.append("from", process.env.CONTACT_FROM!);
    formData.append("to", process.env.CONTACT_TO!);
    formData.append("subject", "New contact form submission");
    formData.append(
      "html",
      `Name: ${payload.name}<br />Email: ${payload.email}<br /><br />${payload.message}`,
    );

    const response = await fetch(
      `https://api.eu.mailgun.net/v3/${process.env.MAILGUN_DOMAIN}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(
            `api:${process.env.MAILGUN_API_KEY}`,
          ).toString("base64")}`,
        },
        body: formData,
      },
    );

    return res.json({ success: response.status === 200 });
  } catch {
    return res.status(400).json({ success: false });
  }
});

const port = process.env.PORT || 8084;

app.listen(port, () => console.log(`Started on port ${port}`));
