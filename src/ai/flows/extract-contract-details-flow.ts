'use server';
/**
 * @fileOverview A Genkit flow for extracting contract details from unstructured text.
 *
 * - extractContractDetails - A function that handles the extraction of contract details.
 * - ExtractContractDetailsInput - The input type for the extractContractDetails function.
 * - ExtractContractDetailsOutput - The return type for the extractContractDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractContractDetailsInputSchema = z.object({
  unstructuredText: z.string().describe('Unstructured text containing contract information.'),
});
export type ExtractContractDetailsInput = z.infer<typeof ExtractContractDetailsInputSchema>;

const ExtractContractDetailsOutputSchema = z.object({
  projectName: z.string().describe('The name of the overall project (e.g., "Student Dormitory Project").'),
  name: z.string().describe('The specific name of the contract (e.g., "Construction Fee").'),
  signingUnit: z.string().describe('The name of the company or unit signing the contract.'),
  price: z.number().describe('The price or total amount of the contract.'),
  type: z.enum(['工程合同', '采购合同']).describe('The type of contract, either "工程合同" (Engineering) or "采购合同" (Procurement).'),
  fundingChannel: z.string().describe('The funding channel or source for the contract (e.g., "财政拨款", "企业自筹").'),
});
export type ExtractContractDetailsOutput = z.infer<typeof ExtractContractDetailsOutputSchema>;

export async function extractContractDetails(
  input: ExtractContractDetailsInput
): Promise<ExtractContractDetailsOutput> {
  return extractContractDetailsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractContractDetailsPrompt',
  input: {schema: ExtractContractDetailsInputSchema},
  output: {schema: ExtractContractDetailsOutputSchema},
  prompt: `You are an expert assistant for contract management. Your task is to extract specific contract details from the provided unstructured text.

Extract the following information:
-   projectName: The overall project name.
-   name: The specific contract name (like supervision, construction, etc).
-   signingUnit: The name of the company, unit, or contractor signing the contract.
-   price: The total monetary value or price of the contract. This should be a number.
-   type: The contract type. If the text mentions "工程", "施工", "维保" etc, use "工程合同". If it mentions "采购", "供货", "软件", "设备" etc, use "采购合同".
-   fundingChannel: The source of funding for the contract.

If any information is not explicitly found, you can infer it if reasonable, but prefer explicit mentions. If a type is not clearly "工程合同" or "采购合同", default to "工程合同".

Return the extracted information in a JSON object matching the output schema. Do not include any other text besides the JSON.

Unstructured text: {{{unstructuredText}}}`,
});

const extractContractDetailsFlow = ai.defineFlow(
  {
    name: 'extractContractDetailsFlow',
    inputSchema: ExtractContractDetailsInputSchema,
    outputSchema: ExtractContractDetailsOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
