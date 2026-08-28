import TrackingDetail from "@/components/TrackingDetail";

type Props = { params: Promise<{ requestNumber: string }> };

export default async function TrackingDetailPage({ params }: Props) {
  const { requestNumber } = await params;
  return <TrackingDetail requestNumber={decodeURIComponent(requestNumber)} />;
}
