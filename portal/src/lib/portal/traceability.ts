import type { NdtRecord, Shipment, TraceabilityLink } from '@/lib/portal/types-ext';
import type { Order, OrderDocument, OrderStage } from '@/lib/types';

export interface TraceabilityNode {
  stage: number;
  label: string;
  heatNumber?: string | null;
  wpsRef?: string | null;
  batchRef?: string | null;
  ndtResult?: string | null;
  stageStatus?: string | null;
  documents: Array<{
    id: string;
    name: string;
    document_type: string;
    is_official?: boolean;
    mime_type?: string | null;
    downloadUrl?: string | null;
  }>;
}

export function buildTraceabilityChain(params: {
  order: Order;
  stages: OrderStage[];
  documents: OrderDocument[];
  ndtRecords: NdtRecord[];
  links: TraceabilityLink[];
  shipments: Shipment[];
  stageLabels?: Record<number, string>;
  documentUrls?: Record<string, string | null>;
}): TraceabilityNode[] {
  const { order, stages, documents, ndtRecords, links, stageLabels, documentUrls } = params;
  const stageMap = new Map(stages.map((s) => [s.stage_number, s]));

  const nodes: TraceabilityNode[] = [];

  for (let stageNum = 1; stageNum <= 7; stageNum += 1) {
    const stage = stageMap.get(stageNum);
    const stageDocs = documents.filter((d) => {
      if (d.file_path?.includes('/general/')) return false;
      return true;
    });

    const link = links.find((l) => l.stage_number === stageNum);
    const ndt = ndtRecords.find((n) => {
      const stageId = stage?.id;
      return stageId && n.stage_id === stageId;
    });

    nodes.push({
      stage: stageNum,
      label: stageLabels?.[stageNum] ?? stage?.title ?? `Stage ${stageNum}`,
      heatNumber: link?.heat_number ?? stage?.heat_number ?? (stageNum === 2 ? order.heat_number : null),
      wpsRef: link?.wps_ref ?? stage?.wps_ref ?? (stageNum === 4 ? order.wps_ref : null),
      batchRef: link?.batch_ref ?? null,
      ndtResult: ndt?.result ?? null,
      stageStatus: stage?.status ?? null,
      documents: stageDocs
        .filter((d) => {
          const primaryStage: Record<string, number> = {
            mtc: 2,
            incoming_inspection: 2,
            wps: 4,
            wpqr: 1,
            ndt: 5,
            welder_cert: 4,
            dimension_report: 3,
            coating_report: 6,
            shipping_doc: 7,
            ce_dop: 7,
          };
          return primaryStage[d.document_type] === stageNum;
        })
        .map((d) => ({
          id: d.id,
          name: d.name,
          document_type: d.document_type,
          is_official: d.is_official,
          mime_type: d.mime_type,
          downloadUrl: documentUrls?.[d.id] ?? null,
        })),
    });
  }

  return nodes;
}

export function traceabilityPublicUrl(token: string, baseUrl?: string) {
  const base = baseUrl ?? process.env.NEXT_PUBLIC_PORTAL_URL ?? '';
  return `${base}/trace/${token}`;
}
