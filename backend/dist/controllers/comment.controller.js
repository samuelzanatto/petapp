"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteComment = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.userId;
        // Verificar se o comentário existe
        const comment = await prisma.comment.findUnique({
            where: { id: commentId },
            include: {
                post: {
                    select: {
                        userId: true
                    }
                }
            }
        });
        if (!comment) {
            return res.status(404).json({ message: 'Comentário não encontrado' });
        }
        // Permitir exclusão apenas se o usuário é o autor do comentário ou dono do post
        if (comment.userId !== userId && comment.post.userId !== userId) {
            return res.status(403).json({
                message: 'Você não tem permissão para excluir este comentário'
            });
        }
        // Excluir o comentário
        await prisma.comment.delete({
            where: { id: commentId }
        });
        res.status(200).json({ message: 'Comentário excluído com sucesso' });
    }
    catch (error) {
        console.error('Erro ao excluir comentário:', error);
        res.status(500).json({ message: 'Erro ao excluir comentário' });
    }
};
exports.deleteComment = deleteComment;
