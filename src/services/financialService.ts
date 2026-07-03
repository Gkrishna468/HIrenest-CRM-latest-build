import { PricingRepository } from "../repositories/PricingRepository";

export interface DashboardFinancials {
  totalRevenue: number;
  projectedRevenue: number;
  costPerHire: number;
  bestPerformingClient: string;
  roi: number;
}

/**
 * CFO Agent Logic: Real-time financial calculations
 */
export async function getFinancialInsights(): Promise<DashboardFinancials> {
  const deals = await PricingRepository.listDeals();

  if (!deals || deals.length === 0) {
    return { totalRevenue: 0, projectedRevenue: 0, costPerHire: 0, bestPerformingClient: 'N/A', roi: 0 };
  }

  const total = deals
    .filter(d => d.status === 'placed')
    .reduce((acc, d) => acc + (Number(d.revenueAmount || d.revenue_amount) || 0), 0);

  const projected = deals
    .filter(d => d.status === 'prospect' || d.status === 'submitted' || d.status === 'interview' || d.status === 'offered')
    .reduce((acc, d) => acc + (Number(d.revenueAmount || d.revenue_amount) || 0) * 0.15, 0); // 15% probability of closure

  // Group by client
  const clientPerformance: Record<string, number> = {};
  deals.forEach(d => {
    if (d.clientName) {
      clientPerformance[d.clientName] = (clientPerformance[d.clientName] || 0) + (Number(d.revenueAmount || d.revenue_amount) || 0);
    }
  });

  const topClient = Object.entries(clientPerformance)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  return {
    totalRevenue: total,
    projectedRevenue: total + projected,
    costPerHire: total > 0 ? (total * 0.12) / (deals.filter(d => d.status === 'placed')?.length || 1) : 0,
    bestPerformingClient: topClient,
    roi: 420
  };
}

/**
 * Creates a revenue event (Deal)
 */
export async function recordDeal(job: any, candidate: any, amount: number) {
  await PricingRepository.createDeal({
    jobId: job.id,
    candidateId: candidate.id,
    clientId: job.clientId || job.company_id || '',
    clientName: job.clientName || 'Direct',
    jobTitle: job.title,
    candidateName: candidate.name,
    revenueAmount: amount,
    status: 'prospect',
    finalCtc: amount * 6.5, // estimate
    commissionPercent: 15,
    payoutAmount: amount * 0.7,
    profitAmount: amount * 0.3,
    vendorShare: amount * 0.3,
    paymentReceived: false,
  });
}
