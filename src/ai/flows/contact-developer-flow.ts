'use server';
/**
 * @fileOverview A Genkit flow for sending feedback or support requests to the developer.
 *
 * - contactDeveloper - A function that handles the message submission.
 * - ContactDeveloperInput - The input type for the contactDeveloper function.
 * - ContactDeveloperOutput - The return type for the contactDeveloper function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ContactDeveloperInputSchema = z.object({
  userEmail: z.string().email().describe('The email of the user sending the message.'),
  subject: z.string().describe('The subject of the message.'),
  message: z.string().describe('The content of the message.'),
});
export type ContactDeveloperInput = z.infer<typeof ContactDeveloperInputSchema>;

const ContactDeveloperOutputSchema = z.object({
  success: z.boolean().describe('Whether the message was processed successfully.'),
  response: z.string().describe('A confirmation message for the user.'),
});
export type ContactDeveloperOutput = z.infer<typeof ContactDeveloperOutputSchema>;

export async function contactDeveloper(input: ContactDeveloperInput): Promise<ContactDeveloperOutput> {
  return contactDeveloperFlow(input);
}

const contactDeveloperFlow = ai.defineFlow(
  {
    name: 'contactDeveloperFlow',
    inputSchema: ContactDeveloperInputSchema,
    outputSchema: ContactDeveloperOutputSchema,
  },
  async (input) => {
    // 模拟发送邮件至 hening300@gmail.com
    console.log(`--- [收到用户反馈，正在转发至 hening300@gmail.com] ---`);
    console.log(`来自: ${input.userEmail}`);
    console.log(`主题: ${input.subject}`);
    console.log(`内容: ${input.message}`);
    console.log(`--- [邮件模拟发送完毕] ---`);
    
    return {
      success: true,
      response: "您的留言已转发至 hening300@gmail.com，开发人员将尽快查阅并回复。",
    };
  }
);
