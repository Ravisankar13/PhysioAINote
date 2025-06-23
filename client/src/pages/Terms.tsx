import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Terms() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-lg text-gray-600">
            Last updated: June 23, 2025
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">1. Acceptance of Terms</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              By accessing and using PhysioGPT and its associated services (the "Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">2. Service Description</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              PhysioGPT is a comprehensive physiotherapy management platform that provides:
            </p>
            <ul className="list-disc list-inside mt-4 space-y-2">
              <li>AI-powered clinical documentation and SOAP note generation</li>
              <li>Evidence-based research tools and PubMed integration</li>
              <li>3D skeletal models and motion capture technology</li>
              <li>Virtual patient management system</li>
              <li>Research gap analysis platform</li>
              <li>Clinical assessment templates and exercise libraries</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">3. Professional Use Only</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              This service is intended for use by qualified healthcare professionals, physiotherapists, and students in the field of physiotherapy. The platform provides educational and clinical support tools but does not replace professional clinical judgment.
            </p>
            <p className="mt-4">
              Users are responsible for ensuring all clinical decisions comply with their professional standards, local regulations, and scope of practice.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">4. Data Privacy and Security</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              We are committed to protecting your privacy and the confidentiality of patient information:
            </p>
            <ul className="list-disc list-inside mt-4 space-y-2">
              <li>All patient data is encrypted and stored securely</li>
              <li>We comply with HIPAA and other applicable privacy regulations</li>
              <li>No patient data is shared with third parties without explicit consent</li>
              <li>Users can request data deletion at any time</li>
              <li>Research data used for gap analysis is fully anonymized</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">5. AI-Generated Content</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              Our AI-powered features, including PhysioGPT and SOAP note generation, provide suggestions based on evidence-based research and clinical best practices. However:
            </p>
            <ul className="list-disc list-inside mt-4 space-y-2">
              <li>AI-generated content should be reviewed and verified by qualified professionals</li>
              <li>The platform does not provide medical diagnosis or treatment recommendations</li>
              <li>Users maintain full responsibility for all clinical decisions</li>
              <li>AI suggestions are based on available research and may not reflect the latest developments</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">6. Research and Evidence Integration</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              Our platform integrates with external research databases including PubMed to provide evidence-based recommendations. While we strive for accuracy:
            </p>
            <ul className="list-disc list-inside mt-4 space-y-2">
              <li>Research citations and abstracts are sourced from third-party databases</li>
              <li>Evidence grades and confidence levels are generated based on available data</li>
              <li>Users should verify all research findings independently</li>
              <li>The platform may not include the most recent research publications</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">7. 14-Day Free Trial</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              New users are provided with a 14-day free trial period:
            </p>
            <ul className="list-disc list-inside mt-4 space-y-2">
              <li>Full access to all platform features during the trial period</li>
              <li>No payment required during the trial</li>
              <li>Users can cancel at any time during the trial period</li>
              <li>Data created during the trial is retained if you subscribe</li>
              <li>After trial expiration, access is limited until subscription activation</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">8. Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              To the fullest extent permitted by law, PhysioGPT shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">9. Modifications to Service</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              We reserve the right to modify or discontinue the Service at any time with reasonable notice. We may also update these terms from time to time, and continued use of the Service constitutes acceptance of any changes.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">10. Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <p className="mt-4 font-semibold">
              Email: physioconversation@gmail.com
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}