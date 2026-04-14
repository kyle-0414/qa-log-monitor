import React from 'react';
import { History, Construction } from 'lucide-react';

export default function HistoryPage() {
  return (
    <div className="placeholder-page">
      <Construction size={48} className="text-dim" />
      <h2>Test History</h2>
      <p className="text-dim">
        테스트 이력 조회 기능이 추가될 예정입니다.
        <br />
        여러 로그 파일의 테스트 결과를 한눈에 비교하고 추적할 수 있습니다.
      </p>
    </div>
  );
}
