'use server';
/**
 * @fileOverview A Genkit flow for generating and simulating the sending of a welcome email with account details.
 *
 * - sendWelcomeEmail - A function that handles the email drafting/sending process.
 * - SendWelcomeEmailInput - The input type for the sendWelcomeEmail function.
 * - SendWelcomeEmailOutput - The return type for the sendWelcomeEmail function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SendWelcomeEmailInputSchema = z.object({
  email: z.string().email().describe('The email address of the new user.'),
  password: z.string().describe('The password chosen by the user.'),
});
export type SendWelcomeEmailInput = z.infer<typeof SendWelcomeEmailInputSchema>;

const SendWelcomeEmailOutputSchema = z.object({
  success: z.boolean().describe('Whether the email was successfully "sent".'),
  content: z.string().describe('The drafted email content.'),
});
export type SendWelcomeEmailOutput = z.infer<typeof SendWelcomeEmailOutputSchema>;

export async function sendWelcomeEmail(input: SendWelcomeEmailInput): Promise<SendWelcomeEmailOutput> {
  return sendWelcomeEmailFlow(input);
}

const prompt = ai.definePrompt({
  name: 'sendWelcomeEmailPrompt',
  input: { schema: SendWelcomeEmailInputSchema },
  output: { schema: SendWelcomeEmailOutputSchema },
  prompt: `你是一个专业的系统管理员。请为刚刚在“合同管理系统”注册的新用户撰写一封欢迎邮件。

用户信息：
- 登录邮箱：{{{email}}}
- 登录密码：{{{password}}}

邮件要求：
1. 语气亲切、专业。
2. 明确告知用户账号已开通，并提醒用户妥善保管账号密码。
3. 邮件结尾署名为“合同管理系统 自动化服务”。
4. 输出格式为 JSON，包含 success (true) 和 content (邮件正文)。`,
});

const sendWelcomeEmailFlow = ai.defineFlow(
  {
    name: 'sendWelcomeEmailFlow',
    inputSchema: SendWelcomeEmailInputSchema,
    outputSchema: SendWelcomeEmailOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    // 在真实场景中，这里会调用 SendGrid/Resend 等邮件服务 API
    console.log(`[模拟发送邮件至 ${input.email}]:`, output?.content);
    return output!;
  }
);
