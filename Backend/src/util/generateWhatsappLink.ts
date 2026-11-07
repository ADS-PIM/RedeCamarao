export const generateWhatsAppLink = (
    phone: string,
    producerName: string
): string | null => {

    const number = phone.replace(/\D/g, '');

    if (!/^\d{12,15}$/.test(number)) {
        return null;
    }

    const message =
        `Olá, ${producerName}! Vi seu anúncio na Rede Camarão e gostaria de mais informações.`;

    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
};