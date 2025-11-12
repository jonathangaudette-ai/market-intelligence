import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rfps, rfpQuestions, rfpResponses } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCompanyBySlug } from '@/lib/rfp/auth';
import { auth } from '@/lib/auth/config';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';

/**
 * GET /api/companies/[slug]/rfps/[id]/export
 * Export RFP responses as a Word document
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id: rfpId } = await params;

    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify company access
    const companyContext = await getCompanyBySlug(slug);
    if (!companyContext) {
      return NextResponse.json(
        { error: 'Company not found or access denied' },
        { status: 403 }
      );
    }

    // Get RFP
    const [rfp] = await db
      .select()
      .from(rfps)
      .where(eq(rfps.id, rfpId))
      .limit(1);

    if (!rfp) {
      return NextResponse.json({ error: 'RFP not found' }, { status: 404 });
    }

    if (rfp.companyId !== companyContext.company.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all questions with responses
    const questions = await db
      .select({
        question: rfpQuestions,
        response: rfpResponses,
      })
      .from(rfpQuestions)
      .leftJoin(
        rfpResponses,
        eq(rfpQuestions.id, rfpResponses.questionId)
      )
      .where(eq(rfpQuestions.rfpId, rfpId))
      .orderBy(rfpQuestions.questionNumber);

    // Create document sections
    const documentSections: Paragraph[] = [];

    // Title page
    documentSections.push(
      new Paragraph({
        text: rfp.title || 'RFP Response',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({
        text: `Client: ${rfp.clientName}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: `Date: ${new Date().toLocaleDateString('fr-FR')}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
      }),
      new Paragraph({
        text: '',
        spacing: { after: 400 },
      })
    );

    // Table of contents (basic)
    documentSections.push(
      new Paragraph({
        text: 'Table des matières',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        text: `Nombre total de questions: ${questions.length}`,
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: `Questions répondues: ${questions.filter(q => q.response).length}`,
        spacing: { after: 400 },
      })
    );

    // Group questions by section
    const questionsBySection = questions.reduce((acc, { question, response }) => {
      const section = question.sectionTitle || 'Autres';
      if (!acc[section]) {
        acc[section] = [];
      }
      acc[section].push({ question, response });
      return acc;
    }, {} as Record<string, Array<{ question: typeof rfpQuestions.$inferSelect; response: typeof rfpResponses.$inferSelect | null }>>);

    // Add each section
    for (const [sectionTitle, sectionQuestions] of Object.entries(questionsBySection)) {
      // Section heading
      documentSections.push(
        new Paragraph({
          text: sectionTitle,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 600, after: 300 },
          pageBreakBefore: true,
        })
      );

      // Add questions in this section
      for (const { question, response } of sectionQuestions) {
        // Question number and category
        const questionMeta: TextRun[] = [];
        if (question.questionNumber) {
          questionMeta.push(
            new TextRun({
              text: `Question ${question.questionNumber}`,
              bold: true,
              color: '1E40AF',
            }),
            new TextRun({ text: '  ' })
          );
        }
        if (question.category) {
          questionMeta.push(
            new TextRun({
              text: `[${question.category}]`,
              italics: true,
              color: '6B7280',
            })
          );
        }

        documentSections.push(
          new Paragraph({
            children: questionMeta,
            spacing: { before: 400, after: 100 },
          }),
          new Paragraph({
            text: question.questionText,
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200 },
          })
        );

        // Word limit indication
        if (question.wordLimit) {
          documentSections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `Limite de mots: ${question.wordLimit}`,
                  italics: true,
                  size: 20,
                  color: '6B7280',
                }),
              ],
              spacing: { after: 100 },
            })
          );
        }

        // Response
        if (response && response.responseText) {
          documentSections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Réponse:',
                  bold: true,
                }),
              ],
              spacing: { before: 200, after: 100 },
            }),
            new Paragraph({
              text: response.responseText,
              spacing: { after: 200 },
            })
          );

          // Response metadata
          const responseMeta: TextRun[] = [];
          if (response.wordCount) {
            responseMeta.push(
              new TextRun({
                text: `Nombre de mots: ${response.wordCount}  `,
                size: 20,
                color: '6B7280',
              })
            );
          }
          if (response.wasAiGenerated) {
            responseMeta.push(
              new TextRun({
                text: `Généré par: ${response.aiModel || 'AI'}`,
                size: 20,
                color: '6B7280',
                italics: true,
              })
            );
          }

          if (responseMeta.length > 0) {
            documentSections.push(
              new Paragraph({
                children: responseMeta,
                spacing: { after: 400 },
              })
            );
          }
        } else {
          // No response yet
          documentSections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: '[Cette question n\'a pas encore été répondue]',
                  italics: true,
                  color: 'DC2626',
                }),
              ],
              spacing: { after: 400 },
            })
          );
        }
      }
    }

    // Create document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: documentSections,
        },
      ],
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);

    // Return as downloadable file
    const filename = `${rfp.title || 'RFP-Response'}_${new Date().toISOString().split('T')[0]}.docx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[RFP Export Error]', error);
    return NextResponse.json(
      {
        error: 'Failed to export RFP',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
