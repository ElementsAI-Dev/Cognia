/**
 * SiliconFlow (硅基流动) pricing scraper - uses API
 */

import type { PricingCategory, ModelPricing, ProviderConfig } from '../types.js'
import { ApiScraper } from './api-base.js'
import { info } from '../utils/logger.js'

export const siliconflowConfig: ProviderConfig = {
  id: 'siliconflow',
  name: 'SiliconFlow (硅基流动)',
  region: 'CN',
  urls: ['https://api.siliconflow.cn/v1/models'],
  currency: '¥',
  unit: '¥ / 1M tokens',
  type: 'api',
  locale: 'zh-CN',
}

interface SiliconFlowModel {
  id: string
  object: string
  owned_by?: string
}

interface SiliconFlowResponse {
  object: string
  data: SiliconFlowModel[]
}

export class SiliconFlowScraper extends ApiScraper {
  async fetchPricingData(): Promise<PricingCategory[]> {
    try {
      const response = await this.fetchJson<SiliconFlowResponse>(this.config.urls[0])
      info(`Found ${response.data.length} models from SiliconFlow API`)

      const models: ModelPricing[] = []

      // SiliconFlow API returns model list but not pricing
      // We use known pricing data for popular models
      const knownPricing: Record<string, { input: string; output: string; free?: boolean }> = {
        'deepseek-ai/DeepSeek-V3': { input: '2', output: '8' },
        'deepseek-ai/DeepSeek-R1': { input: '4', output: '16' },
        'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B': { input: '1.26', output: '1.26' },
        'deepseek-ai/DeepSeek-R1-Distill-Llama-70B': { input: '4.13', output: '4.13' },
        'Qwen/Qwen2.5-72B-Instruct': { input: '4.13', output: '4.13' },
        'Qwen/Qwen2.5-32B-Instruct': { input: '1.26', output: '1.26' },
        'Qwen/Qwen2.5-7B-Instruct': { input: '0', output: '0', free: true },
        'Qwen/QwQ-32B': { input: '1.26', output: '1.26' },
        'meta-llama/Llama-3.3-70B-Instruct': { input: '4.13', output: '4.13' },
        'THUDM/glm-4-9b-chat': { input: '0', output: '0', free: true },
        '01-ai/Yi-1.5-34B-Chat': { input: '1.26', output: '1.26' },
        'internlm/internlm2_5-20b-chat': { input: '1', output: '1' },
      }

      for (const model of response.data) {
        const pricing = knownPricing[model.id]
        if (pricing) {
          models.push({
            model: model.id,
            input: pricing.input,
            output: pricing.output,
            unit: this.config.unit,
            free: pricing.free,
          })
        }
      }

      // If API returned models but we have no pricing, use fallback
      if (models.length === 0 && response.data.length > 0) {
        info('No pricing data available, using fallback')
        return this.categorizeModels(this.getFallbackData())
      }

      return this.categorizeModels(models)
    } catch {
      info('API failed, using fallback data')
      return this.categorizeModels(this.getFallbackData())
    }
  }

  getFallbackData(): ModelPricing[] {
    return [
      { model: 'deepseek-ai/DeepSeek-V3', input: '2', output: '8', unit: '¥ / 1M tokens' },
      { model: 'deepseek-ai/DeepSeek-R1', input: '4', output: '16', unit: '¥ / 1M tokens' },
      { model: 'Qwen/Qwen2.5-72B-Instruct', input: '4.13', output: '4.13', unit: '¥ / 1M tokens' },
      { model: 'Qwen/Qwen2.5-32B-Instruct', input: '1.26', output: '1.26', unit: '¥ / 1M tokens' },
      { model: 'Qwen/Qwen2.5-7B-Instruct', input: '0', output: '0', unit: '¥ / 1M tokens', free: true },
      { model: 'meta-llama/Llama-3.3-70B-Instruct', input: '4.13', output: '4.13', unit: '¥ / 1M tokens' },
      { model: 'THUDM/glm-4-9b-chat', input: '0', output: '0', unit: '¥ / 1M tokens', free: true },
      { model: '01-ai/Yi-1.5-34B-Chat', input: '1.26', output: '1.26', unit: '¥ / 1M tokens' },
      { model: 'internlm/internlm2_5-20b-chat', input: '1', output: '1', unit: '¥ / 1M tokens' },
    ]
  }

  categorizeModels(models: ModelPricing[]): PricingCategory[] {
    if (models.length === 0) return []

    const deepseek = models.filter((m) => m.model.toLowerCase().includes('deepseek'))
    const qwen = models.filter((m) => m.model.toLowerCase().includes('qwen'))
    const llama = models.filter((m) => m.model.toLowerCase().includes('llama'))
    const glm = models.filter((m) => m.model.toLowerCase().includes('glm'))
    const yi = models.filter((m) => m.model.toLowerCase().includes('yi'))
    const other = models.filter(
      (m) =>
        !m.model.toLowerCase().includes('deepseek') &&
        !m.model.toLowerCase().includes('qwen') &&
        !m.model.toLowerCase().includes('llama') &&
        !m.model.toLowerCase().includes('glm') &&
        !m.model.toLowerCase().includes('yi')
    )

    const categories: PricingCategory[] = []
    if (deepseek.length > 0) categories.push({ category: 'DeepSeek', models: deepseek })
    if (qwen.length > 0) categories.push({ category: 'Qwen', models: qwen })
    if (llama.length > 0) categories.push({ category: 'Llama', models: llama })
    if (glm.length > 0) categories.push({ category: 'GLM', models: glm })
    if (yi.length > 0) categories.push({ category: 'Yi', models: yi })
    if (other.length > 0) categories.push({ category: 'Other', models: other })

    return categories
  }
}
