import { FC } from "react";
import "./index.css";
import { Params, useLoaderData } from "react-router";
import { FieldContent, IssueUpdate, IssueWithFields } from "../../types/issues";
import {
  extractParam,
  fetchIssue,
  getProjectIdFromParams,
  updateIssue,
} from "../../utils/requests";
import { formatDate } from "../../utils/date";
import { PROJECTS_URL } from "../../constants";

const IssuePage: FC = () => {
  const issue = useLoaderData() as IssueWithFields;
  const formattedDate = formatDate(issue.createdAt);

  return (
    <div className="mt-4 mx-3 text-start">
      <h4>{issue.summary}</h4>
      <p className="mb-1">
        {issue.issueType.project?.name} &rarr; {issue.issueType.name} &rarr;{" "}
        <span className="fw-semibold issue-page-key">{issue.key}</span>
      </p>
      <p>
        Created at {formattedDate} by {issue.createdBy.displayName}
      </p>
      <div>
        <h5 className="mb-2">Fields</h5>
        <div id="fields-container" className="px-3 py-2">
          {issue.fields.map((field) => {
            const fieldType =
              field.issueField.dataType === "number" ? "number" : "text";
            const inputSize = Math.min(field.content.length / 2, 40);
            return (
              <div className="small-font issue-field" key={field.id}>
                <label htmlFor={`${field.id}`} className="fw-semibold">
                  {field.issueField.name}{" "}
                  <span className="issue-field-data-type">
                    ({field.issueField.dataType})
                  </span>
                </label>
                <input
                  type={fieldType}
                  className="form-control"
                  style={{ width: `${inputSize}rem` }}
                  id={`${field.id}`}
                  name={`${field.id}`}
                  value={field.content}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default IssuePage;

export const issueLoader = async ({ params }: { params: Params }) => {
  const projectId = Number(params.projectId);
  const issueId = Number(params.issueId);

  if (!projectId || !issueId) {
    throw new Error("Invalid project id or issue id in the url");
  }

  const issue = await fetchIssue(projectId, issueId);
  return issue;
};

export const issueAction = async ({
  params,
  request,
}: {
  params: Params;
  request: Request;
}) => {
  const formData = await request.formData();
  const issueFields: FieldContent[] = [];

  formData.forEach((value, key) => {
    const fieldId = Number(key);

    if (fieldId) {
      issueFields.push({
        content: value.toString(),
        issueFieldId: fieldId,
      });
    }
  });

  const summary = formData.get("summary");

  if (!summary) {
    throw new Error("Summary needed to update the issue");
  }

  const issue: IssueUpdate = {
    summary: summary.toString(),
    fields: issueFields,
  };

  const projectId = extractParam({ params, param: "projectId" });
  const issueId = extractParam({ params, param: "issueId" });

  await updateIssue({ projectId, issueId, issue });
};
