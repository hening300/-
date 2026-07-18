
'use server';
/**
 * @fileOverview A Genkit flow for generating professional project financial settlement reports.
 *
 * - generateSettlementReport - A function that creates a comprehensive text-based settlement summary.
 * - SettlementReportInput - The input type containing project and contract aggregates.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SettlementReportInputSchema = z.object({
  projectName: z.string().describe('The name of the completed project.'),
  totalSettlement: z.number().describe('The final total settlement amount for the whole project.'),
  totalBasePrice: z.number().describe('The initial total contract price (base + supplementary).'),
  contractCount: z.number().describe('Number of contracts in this project.'),
  contractsSummary: z.string().describe('A summarized text of all contracts and their outcomes.'),
});
export type SettlementReportInput = z.infer<typeof SettlementReportInputSchema>;

const SettlementReportOutputSchema = z.object({
  summary: z.string().describe('A professional financial settlement summary for the project.'),
  analysis: z.string().describe('Analysis of budget vs settlement, saving or overspending details.'),
  conclusion: z.string().describe('Final audit conclusion and closing remarks.'),
});
export type SettlementReportOutput = z.infer<typeof SettlementReportOutputSchema>;

export async function generateSettlementReport(input: SettlementReportInput): Promise<SettlementReportOutput> {
  return generateSettlementReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSettlementReportPrompt',
  input: { schema: SettlementReportInputSchema },
  output: { schema: SettlementReportOutputSchema },
  prompt: `你是一个资深的工程财务审计专家。请根据以下项目数据，撰写一份正式的《项目财务决算分析报告》。

### 项目基本数据:
- 项目名称: {{{projectName}}}
- 涉及合同总数: {{{contractCount}}} 份
- 初始合同总额 (含补充协议): ¥{{{totalBasePrice}}}
- 最终审计结算总额: ¥{{{totalSettlement}}}

### 合同明细摘要:
{{{contractsSummary}}}

### 报告撰写要求:
1. **财务综述**：简述项目整体投资规模及执行情况。
2. **决算偏差分析**：
   - 如果 最终结算额 < 初始总额，请分析审计核减的成效，肯定节约成本。
   - 如果 最终结算额 > 初始总额，请分析超支原因（如工程变更、量增等）。
   - 计算并说明核减/超支率。
3. **资金支付评价**：根据支付已 100% 完成的情况，评价该项目资金拨付的及时性。
4. **审计结论**：给出专业、严谨的结项评估，确认项目已具备归档条件。
5. **语言风格**：必须使用正式、专业的中文财务审计术语。

请输出结构化的 JSON 数据，包含 summary, analysis 和 conclusion。`,
});

const generateSettlementReportFlow = ai.defineFlow(
  {
    name: 'generateSettlementReportFlow',
    inputSchema: SettlementReportInputSchema,
    outputSchema: SettlementReportOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
