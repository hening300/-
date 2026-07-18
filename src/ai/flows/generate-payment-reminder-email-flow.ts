'use server';
/**
 * @fileOverview A Genkit flow for generating payment reminder emails.
 *
 * - generatePaymentReminderEmail - A function that handles the email generation process.
 * - GeneratePaymentReminderEmailInput - The input type for the generatePaymentReminderEmail function.
 * - GeneratePaymentReminderEmailOutput - The return type for the generatePaymentReminderEmail function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePaymentReminderEmailInputSchema = z.object({
  contractName: z.string().describe('The name of the contract.'),
  fundingChannel: z.string().describe('The funding channel of the contract.'),
  targetAmount: z.number().describe('The target total amount that should be paid according to the contract terms.'),
  totalPaid: z.number().describe('The total amount already paid for the contract.'),
  remainingToTarget: z.number().describe('The amount still needed to reach the target payable amount.'),
});
export type GeneratePaymentReminderEmailInput = z.infer<typeof GeneratePaymentReminderEmailInputSchema>;

const GeneratePaymentReminderEmailOutputSchema = z.string().describe('The drafted payment reminder email.');
export type GeneratePaymentReminderEmailOutput = z.infer<typeof GeneratePaymentReminderEmailOutputSchema>;

export async function generatePaymentReminderEmail(input: GeneratePaymentReminderEmailInput): Promise<GeneratePaymentReminderEmailOutput> {
  return generatePaymentReminderEmailFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePaymentReminderEmailPrompt',
  input: { schema: GeneratePaymentReminderEmailInputSchema },
  output: { schema: GeneratePaymentReminderEmailOutputSchema },
  prompt: `你是一个专业的项目资金管理员。请根据以下项目合同信息，起草一封简短的中文催款邮件给财务部或甲方：
- 合同名称：{{{contractName}}}
- 经费渠道：{{{fundingChannel}}}
- 目前目标应付总计：{{{targetAmount}}}元
- 当前已付总计：{{{totalPaid}}}元
- 本次目标还需支付（催款金额）：{{{remainingToTarget}}}元

要求：
1. 语气专业、商务且礼貌。
2. 直入主题，说明目前的支付进度，并请求尽快拨付剩余目标款项（{{{remainingToTarget}}}元）。
3. 长度控制在100字到150字之间，不要废话。`,
});

const generatePaymentReminderEmailFlow = ai.defineFlow(
  {
    name: 'generatePaymentReminderEmailFlow',
    inputSchema: GeneratePaymentReminderEmailInputSchema,
    outputSchema: GeneratePaymentReminderEmailOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
