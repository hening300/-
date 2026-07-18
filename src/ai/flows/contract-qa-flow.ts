'use server';
/**
 * @fileOverview A Genkit flow for answering questions about contract data with history support.
 *
 * - contractQA - A function that handles queries about the user's contract data.
 * - ContractQAInput - The input type for the contractQA function.
 * - ContractQAOutput - The return type for the contractQA function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const ContractQAInputSchema = z.object({
  query: z.string().describe('The user\'s question about their contracts.'),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().describe('The previous messages in the conversation for context.'),
  contractsData: z.string().describe('A JSON string containing the summarized contract and payment data.'),
  globalStats: z.string().optional().describe('A JSON string containing pre-calculated total statistics.'),
});
export type ContractQAInput = z.infer<typeof ContractQAInputSchema>;

const ContractQAOutputSchema = z.object({
  answer: z.string().describe('The AI-generated answer to the user\'s query.'),
});
export type ContractQAOutput = z.infer<typeof ContractQAOutputSchema>;

export async function contractQA(input: ContractQAInput): Promise<ContractQAOutput> {
  return contractQAFlow(input);
}

const prompt = ai.definePrompt({
  name: 'contractQAPrompt',
  model: googleAI.model('gemini-2.5-flash'),
  input: { schema: ContractQAInputSchema },
  output: { schema: ContractQAOutputSchema },
  prompt: `你是一个专业的合同财务分析师。请根据以下提供的实时数据和对话上下文，回答用户的问题。

### 全局财务概览:
{{{globalStats}}}

### 对话历史 (上下文):
{{#if history}}
{{#each history}}
[{{role}}]: {{{content}}}
{{/each}}
{{/if}}

### 当前合同明细数据:
{{{contractsData}}}

### 核心功能指令：
1. **上下文理解**：如果用户的提问使用了代词（如“他”、“那个单位”、“这些合同”），请参考【对话历史】进行回答。
2. **模糊企业与关键词累加分析**：
   - 检索范围：【合同名称】、【所属项目】、【签约单位】。
   - 累加逻辑：计算匹配项的总结算价、总已付、总剩余。
3. **支付流水提取 (CRITICAL)**：
   - 数据中包含 \`paymentHistory\` 字段，格式为 \`日期(¥金额), 日期(¥金额)\`。
   - 当用户询问具体的支出日期、某月支出总额、或者最近的付款记录时，请务必解析此字段并进行汇总回答。
4. **标准表格呈现 (CRITICAL - Excel 风格)**：
   - 当涉及多份合同列举时，**必须使用标准 Markdown 表格**，确保像 Excel 报表一样严整。
   - 强制表头结构：| 序号 | 签约单位 | 合同细项 | 所属项目 | 结算总额 | 已付金额 | 待付余额 | 进度 |。
   - **对齐规范**：金额和数字列必须右对齐（在 Markdown 中使用 :---: 或 ---:），确保数据排列整齐。
   - **合计行**：表格下方必须提供该清单的【财务总结】和【合计数据】。

### 指令要求：
- 使用财务专业术语，语气专业且严谨。
- 所有财务数字必须带上“¥”符号和千分位符（如 ¥1,234.56）。
- 语言：必须使用中文回答。

用户当前问题：{{{query}}}`,
});

const contractQAFlow = ai.defineFlow(
  {
    name: 'contractQAFlow',
    inputSchema: ContractQAInputSchema,
    outputSchema: ContractQAOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await prompt(input);
      if (!output) throw new Error('AI 返回结果为空');
      return output;
    } catch (error: any) {
      console.error('Genkit Flow Error:', error);
      throw error;
    }
  }
);
