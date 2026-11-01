-- 0005: performance hygiene from the Supabase advisor. No change in who can do what.
-- (1) Covering indexes for foreign keys.
CREATE INDEX audit_logs_institution_idx        ON audit_logs (institution_id);
CREATE INDEX consents_granted_by_idx           ON consents (granted_by_user_id);
CREATE INDEX guardian_links_guardian_idx       ON guardian_links (guardian_user_id);
CREATE INDEX guardian_links_student_idx        ON guardian_links (institution_id, student_user_id);
CREATE INDEX qari_assignments_qari_idx         ON qari_assignments (qari_user_id);
CREATE INDEX qari_assignments_student_idx      ON qari_assignments (institution_id, student_user_id);
CREATE INDEX submissions_consent_idx           ON recitation_submissions (institution_id, consent_id);
CREATE INDEX scholarly_items_approved_by_idx   ON scholarly_items (approved_by);
CREATE INDEX student_profiles_user_idx         ON student_profiles (user_id);

-- (2) FOR ALL write policies also applied to SELECT, duplicating the *_select policies (each already admits the same writers).
-- Split them so each command has exactly one permissive policy. USING / WITH CHECK expressions are unchanged.
DROP POLICY memberships_write ON memberships;
CREATE POLICY memberships_insert ON memberships FOR INSERT TO app_user WITH CHECK (app.in_context(institution_id) AND app.has_role(institution_id, 'tenant_admin'));
CREATE POLICY memberships_update ON memberships FOR UPDATE TO app_user USING (app.in_context(institution_id) AND app.has_role(institution_id, 'tenant_admin')) WITH CHECK (app.in_context(institution_id) AND app.has_role(institution_id, 'tenant_admin'));
CREATE POLICY memberships_delete ON memberships FOR DELETE TO app_user USING (app.in_context(institution_id) AND app.has_role(institution_id, 'tenant_admin'));

DROP POLICY student_profiles_write ON student_profiles;
CREATE POLICY student_profiles_insert ON student_profiles FOR INSERT TO app_user WITH CHECK (app.in_context(institution_id) AND app.has_role(institution_id, 'tenant_admin'));
CREATE POLICY student_profiles_update ON student_profiles FOR UPDATE TO app_user USING (app.in_context(institution_id) AND app.has_role(institution_id, 'tenant_admin')) WITH CHECK (app.in_context(institution_id) AND app.has_role(institution_id, 'tenant_admin'));
CREATE POLICY student_profiles_delete ON student_profiles FOR DELETE TO app_user USING (app.in_context(institution_id) AND app.has_role(institution_id, 'tenant_admin'));

DROP POLICY qari_assignments_write ON qari_assignments;
CREATE POLICY qari_assignments_insert ON qari_assignments FOR INSERT TO app_user WITH CHECK (app.in_context(institution_id) AND app.has_role(institution_id, 'tenant_admin'));
CREATE POLICY qari_assignments_update ON qari_assignments FOR UPDATE TO app_user USING (app.in_context(institution_id) AND app.has_role(institution_id, 'tenant_admin')) WITH CHECK (app.in_context(institution_id) AND app.has_role(institution_id, 'tenant_admin'));
CREATE POLICY qari_assignments_delete ON qari_assignments FOR DELETE TO app_user USING (app.in_context(institution_id) AND app.has_role(institution_id, 'tenant_admin'));

DROP POLICY guardian_links_write ON guardian_links;
CREATE POLICY guardian_links_insert ON guardian_links FOR INSERT TO app_user WITH CHECK (app.in_context(institution_id) AND (app.has_role(institution_id, 'tenant_admin') OR app.has_role(institution_id, 'safeguarding_officer')));
CREATE POLICY guardian_links_update ON guardian_links FOR UPDATE TO app_user USING (app.in_context(institution_id) AND (app.has_role(institution_id, 'tenant_admin') OR app.has_role(institution_id, 'safeguarding_officer'))) WITH CHECK (app.in_context(institution_id) AND (app.has_role(institution_id, 'tenant_admin') OR app.has_role(institution_id, 'safeguarding_officer')));
CREATE POLICY guardian_links_delete ON guardian_links FOR DELETE TO app_user USING (app.in_context(institution_id) AND (app.has_role(institution_id, 'tenant_admin') OR app.has_role(institution_id, 'safeguarding_officer')));
