# Edge Function frontend wiring inventory

Generated with `npm run audit:wiring`. Literal frontend calls only; absence does not prove an endpoint is unused (webhooks, schedules and external callers are outside this scan). Presence does not prove deployment, permissions, credentials or successful execution.

Functions: 43. With literal frontend callers: 17. Without: 26.

| Function | Frontend callers |
|---|---|
| academic-integrity-agent | None found |
| ai-assessment-agent | `src/pages/assessor/AssessorDashboard.tsx` |
| ai-course-builder | `src/pages/ai/AICourseBuilder.tsx`, `src/pages/marketing/EmailCampaigns.tsx` |
| ai-grading-assistant | `src/pages/lecturer/LecturerMarking.tsx` |
| ai-plagiarism-check | None found |
| ai-study-assistant | `src/pages/ai/AIRecommendations.tsx` |
| ai-tutor | None found |
| aws-lab-manager | `src/pages/labs/ITLabsDashboard.tsx` |
| build-lesson-pack | None found |
| check-subscription | None found |
| contact-form | `src/pages/tenant/TenantContactPage.tsx` |
| corporate-bulk-enrol | None found |
| create-checkout | `src/components/modals/RecordPaymentModal.tsx`, `src/pages/student/StudentFees.tsx` |
| create-education-payment | None found |
| customer-portal | None found |
| export-report | `src/pages/finance/FinanceDashboard.tsx` |
| generate-certificate | `src/components/modals/CertificateDownloadModal.tsx` |
| invite-staff | `src/components/admin/AccountOperations.tsx`, `src/components/modals/AddStaffModal.tsx`, `src/pages/landlord/TenantOnboarding.tsx` |
| jaas-token | `src/pages/classroom/LiveClassroom.tsx` |
| lab-provision | None found |
| lecture-reminders | None found |
| marking-consistency-agent | None found |
| microsoft-education-provision | None found |
| nadra-identity-connector | None found |
| notify-application | `src/pages/tenant/apply/DestinationApply.tsx` |
| omniqora-assessment-advisory | `src/pages/assessor/IndependentMarkerQueue.tsx` |
| omniqora-cohort-intelligence | None found |
| omniqora-education-event | None found |
| omniqora-education-retrieve | None found |
| omniqora-executive-snapshot | None found |
| omniqora-factory-dispatch | `src/components/progression/FactoryOperations.tsx` |
| omniqora-knowledge-index | None found |
| omniqora-student-intelligence | None found |
| predictive-analytics | `src/pages/analytics/PredictiveAnalytics.tsx` |
| seed-dev-users | None found |
| send-email | None found |
| send-notification | None found |
| send-sms | None found |
| send-whatsapp | None found |
| teaching-scheduler-agent | None found |
| unipathway-aws-lab-gateway | `src/pages/labs/LMSVirtualLabs.tsx` |
| unipathway-public-enquiry | `src/components/enquiry/InternationalEnquiryForm.tsx` |
| webhook-stripe | None found |
