import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiEdit3, FiDownload, FiShare2 } from 'react-icons/fi';

const ProposalView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const mockProposal = {
    id: id,
    title: 'Marketing Strategy Proposal',
    createdAt: '2025-06-28',
    content: `# Marketing Strategy Proposal

## Executive Summary

This comprehensive marketing strategy proposal outlines a data-driven approach to enhance brand visibility and drive customer acquisition for Q4 2025. Our proposed strategy focuses on digital transformation, customer engagement, and measurable ROI optimization.

## Situation Analysis

### Current Market Position
The current market landscape presents both challenges and opportunities. Our analysis reveals:

- **Market Share**: Currently holding 15% market share in the target demographic
- **Competitive Pressure**: Increased competition from emerging digital-native brands
- **Customer Behavior**: Shift towards online purchasing and social media engagement
- **Technology Adoption**: Growing demand for personalized digital experiences

### Key Challenges
1. Limited digital presence compared to competitors
2. Fragmented customer data across multiple platforms
3. Inconsistent brand messaging across channels
4. Low engagement rates on social media platforms

## Strategic Objectives

### Primary Goals
- Increase brand awareness by 40% within Q4 2025
- Drive 25% increase in qualified leads
- Improve customer engagement metrics by 60%
- Achieve 3:1 ROI on marketing investments

### Secondary Goals
- Establish thought leadership in the industry
- Build a robust customer database
- Create scalable marketing processes
- Develop cross-channel attribution capabilities

## Recommended Strategy

### 1. Digital Transformation Initiative
**Content Marketing Hub**
- Develop a centralized content strategy
- Create educational and thought leadership content
- Implement SEO optimization across all digital assets
- Establish a content calendar with consistent publishing schedule

**Social Media Amplification**
- Launch targeted campaigns on LinkedIn, Twitter, and industry forums
- Develop platform-specific content strategies
- Implement social listening and engagement protocols
- Create employee advocacy programs

### 2. Customer Data Platform
**Unified Customer View**
- Implement comprehensive CRM integration
- Develop customer journey mapping
- Create personalized experience frameworks
- Establish data governance protocols

**Analytics and Attribution**
- Deploy advanced tracking and analytics
- Implement multi-touch attribution modeling
- Create automated reporting dashboards
- Establish KPI monitoring systems

### 3. Lead Generation Engine
**Inbound Marketing**
- Develop high-value content offers
- Optimize conversion paths and landing pages
- Implement progressive profiling strategies
- Create nurturing campaigns for different buyer stages

**Account-Based Marketing**
- Identify and target high-value prospects
- Develop personalized campaign strategies
- Create custom content for target accounts
- Implement sales and marketing alignment processes

## Implementation Timeline

### Phase 1: Foundation (Weeks 1-4)
- CRM implementation and data migration
- Website optimization and content audit
- Team training and process documentation
- Initial campaign development

### Phase 2: Launch (Weeks 5-8)
- Content marketing program launch
- Social media campaign activation
- Lead generation engine deployment
- Analytics and tracking implementation

### Phase 3: Optimization (Weeks 9-12)
- Performance analysis and optimization
- A/B testing of key campaigns
- Process refinement and scaling
- ROI measurement and reporting

## Budget Allocation

### Technology and Tools: $45,000
- Marketing automation platform
- Analytics and attribution tools
- Content management systems
- Design and creative tools

### Content and Creative: $35,000
- Video production and photography
- Graphic design and brand assets
- Copywriting and content development
- Website development and optimization

### Advertising and Promotion: $60,000
- Paid search and display advertising
- Social media advertising
- Industry publication partnerships
- Event sponsorships and webinars

### Personnel and Training: $25,000
- Team training and certification
- Consulting and strategic support
- Project management resources
- Performance incentives

**Total Investment: $165,000**

## Expected Outcomes

### Quantitative Results
- **Lead Generation**: 500+ qualified leads per month
- **Website Traffic**: 150% increase in organic traffic
- **Social Engagement**: 300% increase in social media engagement
- **Conversion Rate**: 25% improvement in lead-to-customer conversion
- **ROI**: 3:1 return on marketing investment

### Qualitative Benefits
- Enhanced brand reputation and thought leadership
- Improved customer experience and satisfaction
- Stronger sales and marketing alignment
- Scalable processes for future growth
- Competitive advantage in digital channels

## Risk Mitigation

### Potential Risks
1. **Technology Integration Challenges**
   - Mitigation: Phased implementation with technical support
   - Contingency: Alternative platform options identified

2. **Content Production Delays**
   - Mitigation: Content calendar with buffer time
   - Contingency: Curated content and repurposing strategies

3. **Budget Overruns**
   - Mitigation: Monthly budget reviews and approvals
   - Contingency: Prioritized feature rollout plan

4. **Team Capacity Constraints**
   - Mitigation: Training and cross-skilling initiatives
   - Contingency: External contractor relationships

## Success Metrics and KPIs

### Leading Indicators
- Content engagement rates
- Social media follower growth
- Website session duration
- Email open and click rates
- Cost per lead trends

### Lagging Indicators
- Monthly recurring revenue growth
- Customer acquisition cost
- Customer lifetime value
- Brand awareness survey results
- Net promoter score improvements

## Conclusion

This marketing strategy proposal presents a comprehensive approach to driving sustainable growth through digital transformation and customer-centric marketing. By implementing the recommended initiatives, we anticipate significant improvements in brand awareness, lead generation, and overall marketing ROI.

The proposed strategy aligns with current market trends while positioning the organization for long-term success. We recommend immediate approval to begin implementation and capitalize on Q4 market opportunities.

**Next Steps:**
1. Approve budget and resource allocation
2. Finalize technology vendor selections
3. Assign project team and responsibilities
4. Begin Phase 1 implementation activities

We look forward to partnering with you to achieve these ambitious but attainable marketing objectives.`
  };

  return (
    <div className="min-h-full bg-white">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-8 py-6">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard/proposal-authoring')}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
              >
                <FiArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{mockProposal.title}</h1>
                <p className="text-gray-600 text-sm mt-1">
                  Created on {new Date(mockProposal.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100">
                <FiShare2 className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100">
                <FiDownload className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100">
                <FiEdit3 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="p-12">
              <div className="prose prose-lg max-w-none">
                {mockProposal.content.split('\n').map((line, index) => {
                  if (line.startsWith('# ')) {
                    return <h1 key={index} className="text-4xl font-bold text-gray-900 mb-8 first:mt-0 border-b border-gray-200 pb-4">{line.substring(2)}</h1>;
                  } else if (line.startsWith('## ')) {
                    return <h2 key={index} className="text-2xl font-bold text-gray-900 mb-6 mt-12">{line.substring(3)}</h2>;
                  } else if (line.startsWith('### ')) {
                    return <h3 key={index} className="text-xl font-semibold text-gray-900 mb-4 mt-8">{line.substring(4)}</h3>;
                  } else if (line.startsWith('**') && line.endsWith('**')) {
                    return <p key={index} className="font-semibold text-gray-900 mb-3 mt-6">{line.substring(2, line.length - 2)}</p>;
                  } else if (line.startsWith('- ')) {
                    return <li key={index} className="text-gray-700 mb-2 ml-6">{line.substring(2)}</li>;
                  } else if (line.match(/^\d+\./)) {
                    return <li key={index} className="text-gray-700 mb-2 ml-6 list-decimal">{line.substring(line.indexOf('.') + 2)}</li>;
                  } else if (line.trim() === '') {
                    return <div key={index} className="mb-4" />;
                  } else {
                    return <p key={index} className="text-gray-700 mb-4 leading-relaxed">{line}</p>;
                  }
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProposalView;