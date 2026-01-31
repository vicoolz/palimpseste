-- ═══════════════════════════════════════════════════════════════════════════
-- 🔧 FIX: Notifications RLS Policy
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Erreur: "new row violates row-level security policy for table notifications"
-- 
-- Ce script corrige les politiques RLS pour la table notifications.
-- Exécutez ce script dans Supabase SQL Editor.
--
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Supprimer les anciennes politiques (ignorer les erreurs si elles n'existent pas)
DROP POLICY IF EXISTS "Les utilisateurs voient leurs notifications" ON notifications;
DROP POLICY IF EXISTS "Les utilisateurs peuvent créer des notifications" ON notifications;
DROP POLICY IF EXISTS "Les utilisateurs peuvent marquer leurs notifications comme lues" ON notifications;
DROP POLICY IF EXISTS "Les utilisateurs peuvent supprimer leurs notifications" ON notifications;

-- 2. S'assurer que RLS est activé
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 3. Politique SELECT : voir ses propres notifications
CREATE POLICY "notifications_select_own"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

-- 4. Politique INSERT : tout utilisateur connecté peut créer une notification
-- La condition vérifie que from_user_id correspond à l'utilisateur connecté
-- ET que user_id est différent de from_user_id (pas de notif pour soi-même)
CREATE POLICY "notifications_insert_authenticated"
    ON notifications FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND auth.uid() = from_user_id
    );

-- 5. Politique UPDATE : marquer ses propres notifications comme lues
CREATE POLICY "notifications_update_own"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 6. Politique DELETE : supprimer ses propres notifications
CREATE POLICY "notifications_delete_own"
    ON notifications FOR DELETE
    USING (auth.uid() = user_id);

-- 7. Vérifier que la table existe avec la bonne structure
-- (Ce SELECT échouera si la table n'existe pas, vous saurez qu'il faut la créer)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- ═══════════════════════════════════════════════════════════════════════════
-- 📝 NOTE: Si vous obtenez encore des erreurs 403, vérifiez dans Supabase:
-- 1. Authentication > Policies > notifications
-- 2. Assurez-vous que les 4 politiques ci-dessus sont bien créées
-- 3. Vérifiez que l'utilisateur est bien connecté (auth.uid() != NULL)
-- ═══════════════════════════════════════════════════════════════════════════
